#include<stdio.h>
#include<conio.h>
#include<string.h>
#include<stdlib.h>
void display(char prdt[][100],int quan[],float pr[],int no) //Printing the updated inventory
{
	int item;
	printf("New list: \n");
	printf("_________________________________________________\n");
	for(item=0;item<no;item++)
	{
		printf(" PRODUCT NAME = %s | QUANTITY = %d | PRICE = Rs %.2f \n",prdt[item],quan[item],pr[item]);
	}
	printf("_________________________________________________\n");
}
int check(char prdt[][100],char product[],int no)  //Checking if the product exists already
{
	int item1;
	for(item1=0;item1<no;item1++)
	{
		if(strcmp(prdt[item1],product)==0)    //Comapring the entered product with those in the inventory
		{
			return 0;
		}

	}
}
int find(char prdt[][100],char name[],int no)
{
	int item2,count=0;
	for(item2=0;item2<no;item2++)
	{
		if(strcmp(prdt[item2],name)==0)    //Searching for a product in the inventory
		{
			count++;             //Increasing the count if the item is found
			return (item2);      //Returning the index of the item
		}
	}
	if(count==0)                  //If count=0 then no item has been found
	{
		printf("Item not found\n");
		return 200;            //Assigning a random number out of range of the index
	}
}
int main()
{
	char prdt[100][100]={"rice","wheat","dal","onions","apples","tomatoes","bread"};
	int quan[100]={200,100,150,50,30,30,60};
	float pr[100]={130.50,100.00,60.99,50.50,60.50,40,30.99};
	int no=7,c;                  //Assigning the number of products in inventory at the beginning
	printf("Menu:\n");
	printf("1.Add a new product to the inventory\n");
	printf("2.Update the quantity of an existing product\n");
	printf("3.Display the details of a specific product\n");
	printf("4.Display the details of all products in the inventory\n");
	printf("5.Calculate and display the total value of the inventory\n");
	printf("6.Update the price of an existing product\n");
	printf("7.Exit\n");
	while(c!=7)
	{	printf("Enter your choice: ");
		scanf("%d",&c);
		switch(c)
		{
			case 1:
				int ch;
				char product[100];
				printf("Enter product name: ");     //Adding the product details to the respective array
				scanf("%s",product);
				no++;                                //Adding a number because item is going to be added
				ch=check(prdt,product,no);
				if(ch!=0)
				{
					strcpy(prdt[no-1],product);    //Since the item list was increased before hand
					printf("Enter quantity: ");     // Hence all the item are added to one index before
					scanf("%d",&quan[no-1]);
					printf("Enter price per unit: ");
					scanf("%f",&pr[no-1]);
					display(prdt,quan,pr,no);
				}
				else
				{
					printf("Item already exists\n");
					no--;     //Decreasing the increased no since the item already exists and that product is not going to be added
					break;
				}
				break;
			case 2:
				char search[100];
				int index1;
				printf("Enter the name of the product whose quantity is to be changed: ");
				scanf("%s",search);
				index1=find(prdt,search,no);
				if(index1!=200)
				{
					printf("Enter new quantity: ");     //Getting new data for the quantity and updating it
					scanf("%d",&quan[index1]);
					display(prdt,quan,pr,no);
				}
				break;
			case 3:
				char search2[100];
				int index2;
				printf("Enter the name of the product: ");
				scanf("%s",search2);
				index2=find(prdt,search2,no);
				if(index2!=200)
				{
					printf("PRODUCT NAME = %s | QUANTITY = %d | PRICE = Rs %.2f \n",prdt[index2],quan[index2],pr[index2]);
				}
				break;
			case 4:
				display(prdt,quan,pr,no);
				break;
			case 5:
				int j;
				float sum=0,val;
				for(j=0;j<no;j++)
				{
					val=0;
					val=quan[j]*pr[j];    //Finding out total price per item
					sum+=val;
				}
				printf("The Total Value in the inventory is %.2f\n",sum);
				break;
			case 6:
				char search3[100];
				int index3;
				printf("Enter product name whose price is to be changed: ");
				scanf("%s",search3);
				index3=find(prdt,search3,no);
				if(index3!=200)
				{
					printf("Enter new price: ");    //Getting the new price and updating it
					scanf("%f",&pr[index3]);
					display(prdt,quan,pr,no);
				}
				break;
			case 7:
				exit(1);                  //Exiting the program with code 1
			default:
				printf("Enter proper choice\n");
		}
		fflush(stdin);
	}
}
